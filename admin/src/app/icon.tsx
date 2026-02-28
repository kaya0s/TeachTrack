import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Image metadata
export const size = {
    width: 512,
    height: 512,
};
export const contentType = 'image/png';

export default async function Icon() {
    const logoPath = join(process.cwd(), 'public', 'brand', 'logo.png');
    const buffer = await readFile(logoPath);
    // Convert Node Buffer to standard ArrayBuffer which next/og supports perfectly
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 256, // Satori requires explicit pixel values for full circles
                    overflow: 'hidden',
                    backgroundColor: '#FFFFFF',
                }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={arrayBuffer as any} width="512" height="512" alt="Logo" style={{ objectFit: 'cover' }} />
            </div>
        ),
        { ...size }
    );
}
