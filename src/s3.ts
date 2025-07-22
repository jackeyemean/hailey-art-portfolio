// src/s3.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
});

export async function uploadToS3(buffer: Buffer, filename: string, mimeType: string) {
  const bucket = process.env.S3_BUCKET!;
  const key = `artworks/${Date.now()}-${filename}`;

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ACL: "private",
  }));

  return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
