import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3 } from '@/lib/s3';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate a unique filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${safeName}`;

    // Read STORAGE_BUCKET or fallback to 'zippp-dev'
    const bucket = process.env.STORAGE_BUCKET || 'zippp-dev';

    // Check credentials configuration
    const accessKey = process.env.STORAGE_ACCESS_KEY;
    const secretKey = process.env.STORAGE_SECRET_KEY;
    const isMockOrUnconfigured = 
      !accessKey || 
      !secretKey || 
      accessKey.includes('placeholder') || 
      secretKey.includes('placeholder');

    if (isMockOrUnconfigured) {
      return NextResponse.json({ url: 'https://placehold.co/600x400?text=Mock+Upload' });
    }

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: filename,
          Body: buffer,
          ContentType: file.type,
        })
      );

      let publicUrl = process.env.STORAGE_PUBLIC_URL;
      if (publicUrl) {
        if (!publicUrl.endsWith('/')) {
          publicUrl += '/';
        }
        return NextResponse.json({ url: `${publicUrl}${filename}` });
      } else {
        return NextResponse.json({ url: `http://localhost:9000/zippp-dev/${filename}` });
      }
    } catch (uploadError) {
      console.error('S3 upload error:', uploadError);
      return NextResponse.json({ url: 'https://placehold.co/600x400?text=Mock+Upload' });
    }
  } catch (err) {
    console.error('Upload endpoint error:', err);
    return NextResponse.json({ url: 'https://placehold.co/600x400?text=Mock+Upload' });
  }
}
