"use client";

import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef } from "react";

// A reply never contains a line break, as with the <input type="text"> this
// field replaces; breaks that get in become one space per run. Never makes
// the text longer, so maxLength still holds.
const LINE_BREAKS = /[\r\n\u2028\u2029]+/g;
const HAS_LINE_BREAK = /[\r\n\u2028\u2029]/;

// How many wrapped lines the field grows to before it scrolls internally
// instead \u2014 WhatsApp-style. A caller can pass a different `maxRows`.
const DEFAULT_MAX_ROWS = 5;

// The field's natural height for its current value: `rows=1` (or CSS)
// supplies the resting height, this grows it up to `maxRows` of wrapped
// text and switches to an internal scrollbar beyond that. Reads the
// computed line-height/padding/border fresh each time rather than caching
// them, so it stays correct across a browser zoom or font-size change.
function autoResize(el, maxRows) {
  const cs = getComputedStyle(el);
  const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
  const border = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
  const padding = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const max = lineHeight * maxRows + padding + border; // border-box height, to set on `el.style.height`
  el.style.height = "auto"; // shrink first, so scrollHeight reflects the new content, not the old box
  // scrollHeight is always content+padding, never border, whatever the box's
  // own box-sizing is (Tailwind's preflight makes that border-box here) — add
  // it back so the box actually fits what was just measured, not `border`px short.
  const contentHeight = el.scrollHeight + border;
  const next = Math.min(contentHeight, max);
  el.style.height = `${next}px`;
  el.style.overflowY = contentHeight > max + 0.5 ? "auto" : "hidden";
}

function flattenLineBreaks(text, caret) {
  const at = Math.max(0, Math.min(caret, text.length));
  return {
    text: text.replace(LINE_BREAKS, " "),
    caret: text.slice(0, at).replace(LINE_BREAKS, " ").length,
  };
}

// Insert as one edit — on the undo stack where the browser allows it — and
// within maxLength, which setRangeText alone wouldn't enforce.
function insertText(el, text) {
  if (document.activeElement !== el) el.focus({ preventScroll: true });
  if (document.activeElement === el && document.execCommand("insertText", false, text)) return;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  const room = el.maxLength >= 0 ? el.maxLength - (el.value.length - (end - start)) : text.length;
  el.setRangeText(text.slice(0, Math.max(0, room)), start, end, "end");
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

// Enter in a one-line field submits its form unless the form's default
// button is disabled; a textarea doesn't, so do what the input did.
function submitImplicitly(form) {
  if (!form) return;
  const submitter = Array.from(form.elements).find((el) => el.type === "submit");
  if (submitter?.disabled) return;
  if (typeof form.requestSubmit === "function") {
    if (submitter) form.requestSubmit(submitter);
    else form.requestSubmit();
  } else if (submitter) {
    submitter.click(); // Safari < 16
  } else {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  }
}

/**
 * The reply field of the support console: Enter sends; text wraps and the
 * field grows with it, up to `maxRows`, then scrolls internally — like a
 * WhatsApp/iMessage composer.
 *
 * Why a <textarea>: Chrome on Android shows its autofill bar (passwords, cards,
 * addresses) above the keyboard for every text <input>, autocomplete="off" or
 * not, and never for a textarea. A chat reply is never autofill data. (This is
 * about the element, not its row count or wrapping — both are unrelated to
 * Chrome's autofill heuristic.)
 *
 * Enter (Shift+Enter too) never inserts a break and submits the enclosing
 * form, exactly as it did for the input. A keyboard that commits "\n" instead
 * of pressing Enter submits too. Pasted, dropped or committed breaks become
 * spaces. Enter that confirms an IME composition only confirms it.
 */
const ChatComposerField = forwardRef(function ChatComposerField({ className, maxRows = DEFAULT_MAX_ROWS, onChange, onKeyDown, ...props }, ref) {
  const fieldRef = useRef(null);
  const setRef = useCallback(
    (el) => {
      fieldRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref]
  );

  // Edits (beforeinput events) in the current task. WebKit applies a
  // multi-line paste or keyboard commit piece by piece — text, break, text —
  // all in one task, and the field must not be touched until it is done.
  const editsRef = useRef(0);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && e.nativeEvent.isComposing) return;
      onKeyDown?.(e);
      if (e.key !== "Enter" || e.defaultPrevented) return;
      e.preventDefault();
      submitImplicitly(e.currentTarget.form); // any Enter, Shift+Enter too — as the input did
    },
    [onKeyDown]
  );

  const handleChange = useCallback(
    (e) => {
      const el = e.currentTarget;
      // mid-way through a multi-part insert the effect flattens at task end
      if (editsRef.current <= 1 && HAS_LINE_BREAK.test(el.value)) {
        const { text, caret } = flattenLineBreaks(el.value, el.selectionStart ?? el.value.length);
        el.value = text;
        el.setSelectionRange(caret, caret);
      }
      onChange?.(e);
    },
    [onChange]
  );

  // Line breaks never get in:
  //   - text arriving with breaks as one edit (paste, drop, a keyboard
  //     committing several lines) is cancelled and inserted again flattened;
  //   - a break that is the only edit of its task is a keyboard committing
  //     "\n" instead of pressing Enter (some Android keyboards): it is
  //     replayed as Enter once the task is over, so the send key keeps
  //     working and reads the final text;
  //   - a break among other edits of its task is a piece of a multi-part
  //     insert: it is dropped, and becomes a space once the task is over,
  //     when anything else that slipped in is flattened too. A text piece is
  //     never cancelled — WebKit would carry on from the wrong place.
  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return undefined;
    let breaks = []; // caret offsets of the breaks dropped in this task
    const endOfTask = () => {
      const lone = breaks.length === 1 && editsRef.current === 1;
      const at = breaks.sort((a, b) => b - a);
      editsRef.current = 0;
      breaks = [];
      if (lone) {
        el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));
        return;
      }
      let changed = false;
      for (const i of at) {
        const v = el.value;
        const full = el.maxLength >= 0 && v.length >= el.maxLength;
        if (full || !v[i - 1]?.trim() || !v[i]?.trim()) continue; // edges and existing spaces stay as they are
        el.setRangeText(" ", i, i, "preserve");
        changed = true;
      }
      if (HAS_LINE_BREAK.test(el.value)) {
        const { text, caret } = flattenLineBreaks(el.value, el.selectionStart ?? el.value.length);
        el.setRangeText(text, 0, el.value.length, "end"); // not el.value =: React must see the change
        el.setSelectionRange(caret, caret);
        changed = true;
      }
      if (changed) el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const onBeforeInput = (e) => {
      const first = editsRef.current++ === 0;
      if (first) setTimeout(endOfTask, 0);
      const text = e.data ?? e.dataTransfer?.getData("text/plain") ?? "";
      // a keyboard committing "\n" as text (never a paste or drop of one)
      const onlyBreaks = e.inputType === "insertText" && HAS_LINE_BREAK.test(text) && flattenLineBreaks(text, 0).text === " ";
      if (e.inputType === "insertLineBreak" || e.inputType === "insertParagraph" || onlyBreaks) {
        e.preventDefault();
        if (!e.isComposing) breaks.push(el.selectionStart ?? el.value.length);
        return;
      }
      if (!first || !e.cancelable || !HAS_LINE_BREAK.test(text)) return;
      e.preventDefault();
      const flat = flattenLineBreaks(text, 0).text;
      queueMicrotask(() => insertText(el, flat));
    };
    el.addEventListener("beforeinput", onBeforeInput);
    return () => el.removeEventListener("beforeinput", onBeforeInput);
  }, []);

  // Grows with the (wrapped) content, capped at maxRows — before paint, so
  // a restored draft or a programmatic clear never flashes the wrong height.
  useLayoutEffect(() => {
    const el = fieldRef.current;
    if (el) autoResize(el, maxRows);
  }, [props.value, maxRows]);

  // A browser zoom or orientation change can change the line-height in CSS
  // pixels without changing the value; recompute against the same content.
  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return undefined;
    const onResize = () => autoResize(el, maxRows);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [maxRows]);

  return (
    <textarea
      ref={setRef}
      rows={1}
      autoComplete="off"
      autoCorrect="on"
      autoCapitalize="sentences"
      enterKeyHint="send"
      inputMode="text"
      aria-multiline={false}
      {...props}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      // a plain join: none of these clash with a caller's classes, and this page
      // doesn't otherwise load tailwind-merge (8 kB on its first load)
      className={`block resize-none [overflow-wrap:anywhere] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/15 [&::-webkit-scrollbar-thumb]:rounded-full ${className ?? ""}`}
    />
  );
});

export default ChatComposerField;
