import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const R2_ACCOUNT_ID = "115656f85d158ab4a05bc03f1e2c198a";
const R2_ACCESS_KEY_ID = "74135da0616978bbca9f5ea70caafdac";
const R2_SECRET_ACCESS_KEY = "b8452c084274f9cbeab19ed8d31addb022e6c499b5001e0094a840ad881e8aaa";
const R2_BUCKET = "service-photos";
const R2_PUBLIC_BASE = "https://pub-c74d9a0feb4a4dd0ae8d0241175b3c38.r2.dev";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "Expected multipart/form-data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const path = (form.get("path") as string | null) ?? "";

    if (!file) {
      return new Response(JSON.stringify({ error: "Missing file field" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!path) {
      return new Response(JSON.stringify({ error: "Missing path field" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileType = file.type || "image/jpeg";
    const bytes = await file.arrayBuffer();

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: path,
        Body: new Uint8Array(bytes),
        ContentType: fileType,
      })
    );

    const publicUrl = `${R2_PUBLIC_BASE}/${path}`;

    return new Response(JSON.stringify({ url: publicUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("R2 upload error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Upload failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
