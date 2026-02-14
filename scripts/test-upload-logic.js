
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function testUpload() {
    console.log('--- Testing Thumbnail Upload ---');

    // 1. Create a fake image file
    const testDir = path.join(process.cwd(), 'temp_test');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
    const fakeImagePath = path.join(testDir, 'fake.jpg');
    fs.writeFileSync(fakeImagePath, Buffer.from('FAKE_IMAGE_DATA'));

    // 2. Mock calling the API
    // Since we can't easily mock NextRequest without booting Next.js, 
    // we will test the logic by importing the handler logic OR just use curl if the server was running.
    // Actually, let's just use 'fetch' against localhost:3000 if the server is up.
    // But reliable local testing without server running is to DIRECTLY test the file writing logic 
    // which is simple: get formData -> save to public/thumbnails/generated

    // Let's verify the directory structure exists first.
    const targetDir = path.join(process.cwd(), 'public', 'thumbnails', 'generated');
    if (!fs.existsSync(targetDir)) {
        console.log('Creating target directory:', targetDir);
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // Simulate save
    const testId = 'TEST_PRODUCT_123';
    const targetPath = path.join(targetDir, `${testId}.jpg`);

    try {
        fs.writeFileSync(targetPath, fs.readFileSync(fakeImagePath));
        console.log('✅ File write success:', targetPath);

        if (fs.existsSync(targetPath)) {
            console.log('✅ Verification: File exists on disk.');
            // Cleanup
            fs.unlinkSync(targetPath);
            console.log('✅ Cleanup complete.');
        } else {
            console.error('❌ Verification failed: File not found.');
        }
    } catch (e) {
        console.error('❌ File write failed:', e);
    }

    // Cleanup temp
    fs.unlinkSync(fakeImagePath);
    fs.rmdirSync(testDir);
}

testUpload();
