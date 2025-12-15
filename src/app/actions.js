"use server";

import { Resend } from "resend";
import { MongoClient } from "mongodb";
import jwt from "jsonwebtoken";

const resend = new Resend(process.env.RESEND_API_KEY);
const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined in the environment variables");
}

const client = new MongoClient(uri);

async function connectToDatabase() {
  try {
    await client.connect();
    return client.db("majestic_escape");
  } catch (error) {
    console.error("Failed to connect to the database", error);
    throw error;
  }
}

export async function requestLoginOtp(email, password) {
  try {
    const db = await connectToDatabase();
    const users = db.collection("admin-db");

    if (process.env.NEXT_PUBLIC_ENV === "dev") {
      console.log(email);
    }
    const user = await users.findOne({ email });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.password != password) {
      return { success: false, error: "Invalid credentials" };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await users.updateOne({ email }, { $set: { loginOtp: otp } });

    if (!process.env.RESEND_API_KEY) {
      throw new Error(
        "RESEND_API_KEY is not defined in the environment variables"
      );
    }

    await resend.emails.send({
      from: "Majestic Escape <noreply@majesticescape.in>",
      to: email,
      subject: "Login OTP for Majestic Escape",
      html: `Your login OTP is: ${otp}`,
    });

    return { success: true };
  } catch (error) {
    console.error("Error in requestLoginOtp:", error);
    return { success: false, error: "Failed to send login OTP" };
  } finally {
    await client.close();
  }
}

export async function verifyLoginOtp(email, otp) {
  try {
    const db = await connectToDatabase();
    const users = db.collection("admin-db");

    const user = await users.findOne({ email, loginOtp: otp });

    if (!user) {
      return { success: false, error: "Invalid OTP" };
    }

    await users.updateOne({ email }, { $unset: { loginOtp: "" } });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return { success: true, token };
  } catch (error) {
    console.error("Error in verifyLoginOtp:", error);
    return { success: false, error: "Failed to verify login OTP" };
  } finally {
    await client.close();
  }
}
