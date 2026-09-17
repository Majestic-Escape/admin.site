"use client";
// KYC details of one host: the four step pills (existing) and, since
// Batch A2, the identity documents the host uploaded, served only through
// the admin-only, audited backend endpoints. Documents are fetched on
// demand (View / Download), previewed from an in-memory blob (images in the
// photo lightbox, PDFs in an iframe) and never given a public URL. At most
// two previews are kept alive; everything is revoked on unmount.
import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import PhotoLightbox from "@/components/ui/photo-lightbox";
import { KycDetailsSkeleton } from "./kyc-details-skeleton";
import { USER } from "@/lib/query-presets";
import { queryKeys } from "@/lib/query-keys";
import { formatDate } from "@/lib/format";
import {
  fetchKycDocuments,
  fetchKycDocumentBlob,
  fetchKycSteps,
  markKycDocumentVerified,
} from "@/lib/admin-api";

const PREVIEW_CACHE_SIZE = 2;
const DATE_TIME = { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" };

function Pill({ ok, children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
      }`}
    >
      {children}
    </span>
  );
}

function StatusPill({ status }) {
  const map = {
    success: ["bg-green-100 text-green-800", "OCR read"],
    failed: ["bg-red-100 text-red-800", "OCR failed"],
    pending: ["bg-amber-100 text-amber-800", "OCR pending"],
  };
  const [cls, label] = map[status] || ["bg-gray-100 text-gray-800", status || "—"];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

function ReviewBadge({ doc }) {
  if (doc.isVerified) return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Verified document</span>;
  if (doc.needsReview) return <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">Needs review</span>;
  if (doc.isCurrent) return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">Latest attempt</span>;
  return null;
}

function formatBytes(n) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function KycDetailsPage() {
  const params = useParams();
  const hostId = params.id;
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const stepsQuery = useQuery({
    queryKey: queryKeys.adminKyc(hostId),
    queryFn: () => fetchKycSteps(hostId),
    enabled: !!hostId,
    ...USER,
  });
  const docsQuery = useQuery({
    queryKey: queryKeys.adminKycDocuments(hostId),
    queryFn: () => fetchKycDocuments(hostId),
    enabled: !!hostId,
    ...USER,
  });

  const form = stepsQuery.data?.[0];
  const user = docsQuery.data?.user;
  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    [searchParams.get("firstName"), searchParams.get("lastName")].filter(Boolean).join(" ") ||
    "—";
  const email = user?.email || form?.hostEmail || searchParams.get("email") || "—";

  // --- previews ------------------------------------------------------------
  // id → { url, mime }; insertion order = age. Older entries are revoked as
  // soon as the cache exceeds PREVIEW_CACHE_SIZE.
  const previews = React.useRef(new Map());
  const abortRef = React.useRef(null);
  const [busyId, setBusyId] = React.useState(null);
  const [lightbox, setLightbox] = React.useState(null); // { url, title }
  const [pdf, setPdf] = React.useState(null); // { url, title }
  const [reviewTarget, setReviewTarget] = React.useState(null);
  const [marking, setMarking] = React.useState(false);

  React.useEffect(() => {
    const cache = previews.current;
    return () => {
      abortRef.current?.abort();
      for (const entry of cache.values()) URL.revokeObjectURL(entry.url);
      cache.clear();
    };
  }, []);

  const remember = (id, url, mime) => {
    const cache = previews.current;
    cache.set(id, { url, mime });
    while (cache.size > PREVIEW_CACHE_SIZE) {
      const [oldestId, oldest] = cache.entries().next().value;
      URL.revokeObjectURL(oldest.url);
      cache.delete(oldestId);
    }
  };

  const showPreview = (doc, url, mime) => {
    const title = `${doc.documentType} · ${fullName}`;
    if (mime.startsWith("image/")) setLightbox({ url, title });
    else if (mime === "application/pdf") setPdf({ url, title });
    else toast.message("This file cannot be previewed — use Download to inspect it.");
  };

  const view = async (doc) => {
    const cached = previews.current.get(doc._id);
    if (cached) return showPreview(doc, cached.url, cached.mime);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusyId(doc._id);
    try {
      const { blob, contentType } = await fetchKycDocumentBlob(hostId, doc._id, "view", controller.signal);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      remember(doc._id, url, contentType);
      showPreview(doc, url, contentType);
    } catch (err) {
      if (err?.name === "AbortError" || controller.signal.aborted) return;
      if (err?.status !== 401) toast.error(`Preview unavailable: ${err?.message || "request failed"}`);
    } finally {
      if (!controller.signal.aborted) setBusyId(null);
    }
  };

  // Always a fresh request (audited separately as a download); the
  // temporary URL is revoked right after the save is triggered.
  const download = async (doc) => {
    setBusyId(doc._id);
    try {
      const { blob, filename } = await fetchKycDocumentBlob(hostId, doc._id, "download");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `kyc-${doc._id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      if (err?.status !== 401) toast.error(`Download failed: ${err?.message || "request failed"}`);
    } finally {
      setBusyId(null);
    }
  };

  const markVerified = async () => {
    if (!reviewTarget) return;
    setMarking(true);
    try {
      const res = await markKycDocumentVerified(hostId, reviewTarget._id);
      toast.success(res.data.completed ? "Document verified — the host's KYC is now complete." : "Document verified.");
      setReviewTarget(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.adminKycDocuments(hostId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminKyc(hostId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminGuestsAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminListingsAll });
    } catch (err) {
      if (err?.status !== 401) toast.error(err?.message || "Could not mark the document as verified");
      if (err?.status === 409) {
        setReviewTarget(null);
        queryClient.invalidateQueries({ queryKey: queryKeys.adminKycDocuments(hostId) });
      }
    } finally {
      setMarking(false);
    }
  };

  const docs = docsQuery.data?.documents ?? [];
  const formInfo = docsQuery.data?.form;

  return (
    <div className="flex-1 min-h-screen space-y-4 bg-gray-200 p-4 pt-6 md:p-8">
      <div className="flex min items-center justify-between space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight font-bricolage">Kyc Details</h2>
      </div>
      <div className="space-y-4">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="text-absoluteDark font-bricolage font-medium text-xl">Steps List</CardTitle>
            <CardDescription>View each step status</CardDescription>
          </CardHeader>
          <CardContent>
            {stepsQuery.isPending ? (
              <KycDetailsSkeleton />
            ) : stepsQuery.isError ? (
              <div className="flex items-center justify-between gap-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <span>Could not load the KYC steps: {stepsQuery.error?.message}</span>
                <Button size="sm" variant="outline" onClick={() => stepsQuery.refetch()}>
                  Retry
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Guest</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Step 1: Data</TableHead>
                      <TableHead>Step 2: Document</TableHead>
                      <TableHead>Step 3: GST</TableHead>
                      <TableHead>Step 4: Terms</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form ? (
                      <TableRow key={form._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center w-full">
                            <span className="w-32">{fullName}</span>
                          </div>
                        </TableCell>
                        <TableCell>{email}</TableCell>
                        <TableCell>
                          <Pill ok={form.personalInfo?.address?.pincode != "" && form.status == "completed"}>
                            {form.personalInfo?.address?.pincode != "" && form.status == "completed" ? "Completed" : "Pending"}
                          </Pill>
                        </TableCell>
                        <TableCell>
                          <Pill ok={!!form.documentInfo?.isVerified}>{form.documentInfo?.isVerified ? "Completed" : form.documentInfo?.reviewStatus === "needs_review" ? "Needs review" : "Pending"}</Pill>
                        </TableCell>
                        <TableCell>
                          <Pill ok={!!form.gstInfo?.isVerified}>{form.gstInfo?.isVerified ? "Completed" : "Pending"}</Pill>
                        </TableCell>
                        <TableCell>
                          <Pill ok={!!form.acceptedTerms?.general}>{form.acceptedTerms?.general ? "Completed" : "Pending"}</Pill>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                          This host has not started their KYC yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="text-absoluteDark font-bricolage font-medium text-xl">Uploaded documents</CardTitle>
            <CardDescription>
              Identity documents submitted for verification, newest first. Every view and download is recorded.
              {docsQuery.data?.hasMore ? " Showing the latest 20 uploads." : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {docsQuery.isPending ? (
              <div className="space-y-2" aria-busy="true" aria-label="Loading documents">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : docsQuery.isError ? (
              <div className="flex items-center justify-between gap-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <span>Could not load the documents: {docsQuery.error?.message}</span>
                <Button size="sm" variant="outline" onClick={() => docsQuery.refetch()}>
                  Retry
                </Button>
              </div>
            ) : docs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No documents uploaded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>OCR</TableHead>
                      <TableHead>Name on document</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docs.map((doc) => {
                      const busy = busyId === doc._id;
                      const previewable = doc.mime.startsWith("image/") || doc.mime === "application/pdf";
                      return (
                        <TableRow key={doc._id} className={doc.isCurrent ? "bg-primaryGreen/5" : undefined}>
                          <TableCell className="font-medium">
                            {doc.documentType}
                            {doc.numberMasked ? <span className="ml-2 text-xs text-muted-foreground">{doc.numberMasked}</span> : null}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{formatDate(doc.createdAt, DATE_TIME)}</TableCell>
                          <TableCell>
                            <StatusPill status={doc.status} />
                          </TableCell>
                          <TableCell>{doc.nameOnDocument || "—"}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatBytes(doc.sizeBytes)}</TableCell>
                          <TableCell>
                            <ReviewBadge doc={doc} />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap justify-end gap-2">
                              {previewable ? (
                                <Button size="sm" variant="outline" className="bg-white" onClick={() => view(doc)} disabled={busy} aria-busy={busy}>
                                  {busy ? "Loading…" : "View"}
                                </Button>
                              ) : null}
                              <Button size="sm" variant="outline" className="bg-white" onClick={() => download(doc)} disabled={busy}>
                                Download
                              </Button>
                              {doc.needsReview ? (
                                <Button size="sm" className="bg-primaryGreen text-white hover:bg-brightGreen" onClick={() => setReviewTarget(doc)} disabled={busy}>
                                  Mark as verified
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {formInfo?.reviewStatus === "needs_review" ? (
                  <p className="mt-3 text-sm text-amber-800">
                    The latest upload could not be verified automatically
                    {formInfo.reviewReason === "NAME_MISMATCH" ? " because the name on the document does not match the account name" : ""}
                    . Compare it with the account details and use “Mark as verified” to complete the host&apos;s KYC.
                  </p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PhotoLightbox
        images={lightbox ? [lightbox.url] : []}
        open={!!lightbox}
        onOpenChange={(open) => {
          if (!open) setLightbox(null);
        }}
        title={lightbox?.title}
      />

      <Dialog
        open={!!pdf}
        onOpenChange={(open) => {
          if (!open) setPdf(null);
        }}
      >
        <DialogContent className="h-[85vh] w-[calc(100%-2rem)] max-w-4xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{pdf?.title}</DialogTitle>
            <DialogDescription>Preview of the uploaded PDF.</DialogDescription>
          </DialogHeader>
          {pdf ? <iframe src={pdf.url} title={pdf.title} className="h-full w-full rounded border bg-white" /> : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!reviewTarget}
        onOpenChange={(open) => {
          if (!open && !marking) setReviewTarget(null);
        }}
      >
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this document as verified?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm that the {reviewTarget?.documentType || "document"} uploaded on {formatDate(reviewTarget?.createdAt, DATE_TIME)} belongs to {fullName}.
              This completes the host&apos;s KYC if they have accepted the terms, and is recorded under your admin account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={marking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                markVerified();
              }}
              disabled={marking}
              aria-busy={marking}
              className="bg-primaryGreen text-white hover:bg-brightGreen"
            >
              {marking ? "Saving…" : "Mark as verified"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
