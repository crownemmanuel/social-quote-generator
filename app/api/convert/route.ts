import sharp from 'sharp';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as unknown as File | null;
    if (!file) {
      return new Response('Missing file', { status: 400 });
    }

    // Read file into a Node.js Buffer
    const arrayBuffer = await file.arrayBuffer();
    const input = Buffer.from(arrayBuffer);

    // Convert to JPEG with good quality
    const output = await sharp(input, { limitInputPixels: false })
      .jpeg({ quality: 90 })
      .toBuffer();

    return new Response(new Uint8Array(output), {
      status: 200,
      headers: {
        'content-type': 'image/jpeg',
        'cache-control': 'no-store',
      },
    });
  } catch (err: any) {
    const message = err?.message || String(err);
    return new Response(`Conversion failed: ${message}`, { status: 500 });
  }
}


