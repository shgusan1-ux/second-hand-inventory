const { createClient } = require('@libsql/client');

const client = createClient({
    url: 'libsql://second-hand-inventory-shgusan1-ux.aws-ap-northeast-1.turso.io',
    authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDIyNjYwNDQsImlhdCI6MTc3MDczMDA0NCwiaWQiOiI5NWQ2ZWVmNC05MGQ2LTQ3ZDYtYTNlZi0wMzFmYTkzOGYyNGMiLCJyaWQiOiJmYWUyYjI4Yy0zM2I5LTQ2OGItYmEwOS1lMmY3NTQxYjQ5ODYifQ.l1mNE_w5wXuLTm5OhVrG-YI4gBlYHTL-D4BZxMbnsT_z4kqeKHAspRbPThXRnXL6kH-wcy5n5fUmjvROKjGIDA'
});

async function analyze() {
    const eq = "=".repeat(80);
    console.log(eq);
    console.log("supplier_products image data analysis");
    console.log(eq);

    const totalResult = await client.execute("SELECT COUNT(*) as cnt FROM supplier_products");
    console.log("\n[0] Total products: " + totalResult.rows[0].cnt);

    console.log("\n" + eq);
    console.log("[1] image_urls JSON key pattern analysis");
    console.log(eq);

    const allRows = await client.execute("SELECT product_code, name, image_urls FROM supplier_products WHERE image_urls IS NOT NULL AND image_urls != ''");
    const keyFrequency = {};
    const urlPatterns = {};
    const imageCountDist = {};
    let parseErrorCount = 0;
    let validJsonCount = 0;

    for (const row of allRows.rows) {
        try {
            const parsed = JSON.parse(row.image_urls);
            validJsonCount++;
            if (typeof parsed === "object" && !Array.isArray(parsed)) {
                const keys = Object.keys(parsed);
                imageCountDist[keys.length] = (imageCountDist[keys.length] || 0) + 1;
                for (const key of keys) {
                    keyFrequency[key] = (keyFrequency[key] || 0) + 1;
                    const url = parsed[key];
                    if (typeof url === "string" && url.startsWith("http")) {
                        try { const u = new URL(url); urlPatterns[u.hostname] = (urlPatterns[u.hostname] || 0) + 1; } catch {}
                    }
                }
            } else if (Array.isArray(parsed)) {
                imageCountDist[parsed.length] = (imageCountDist[parsed.length] || 0) + 1;
                for (let i = 0; i < parsed.length; i++) {
                    keyFrequency["["+i+"]"] = (keyFrequency["["+i+"]"] || 0) + 1;
                    const url = parsed[i];
                    if (typeof url === "string" && url.startsWith("http")) {
                        try { const u = new URL(url); urlPatterns[u.hostname] = (urlPatterns[u.hostname] || 0) + 1; } catch {}
                    }
                }
            }
        } catch (e) { parseErrorCount++; }
    }

    console.log("\nimage_urls has data: " + allRows.rows.length);
    console.log("Valid JSON: " + validJsonCount);
    console.log("Parse errors: " + parseErrorCount);

    console.log("\n--- JSON key frequency (top 30) ---");
    Object.entries(keyFrequency).sort((a, b) => b[1] - a[1]).slice(0, 30).forEach(([key, count]) => console.log("  " + key + ": " + count));

    console.log("\n--- URL domain patterns ---");
    Object.entries(urlPatterns).sort((a, b) => b[1] - a[1]).forEach(([domain, count]) => console.log("  " + domain + ": " + count));

    // Section 2
    console.log("\n" + eq);
    console.log("[2] logo_image, label_image column analysis");
    console.log(eq);

    const logoResult = await client.execute("SELECT COUNT(*) as total, SUM(CASE WHEN logo_image IS NOT NULL AND logo_image != '' THEN 1 ELSE 0 END) as has_logo, SUM(CASE WHEN label_image IS NOT NULL AND label_image != '' THEN 1 ELSE 0 END) as has_label, SUM(CASE WHEN (logo_image IS NOT NULL AND logo_image != '') AND (label_image IS NOT NULL AND label_image != '') THEN 1 ELSE 0 END) as has_both FROM supplier_products");
    const r2 = logoResult.rows[0];
    console.log("\nTotal: " + r2.total);
    console.log("has logo_image: " + r2.has_logo + " (" + ((r2.has_logo / r2.total) * 100).toFixed(1) + "%)");
    console.log("has label_image: " + r2.has_label + " (" + ((r2.has_label / r2.total) * 100).toFixed(1) + "%)");
    console.log("has both: " + r2.has_both + " (" + ((r2.has_both / r2.total) * 100).toFixed(1) + "%)");

    const logoSamples = await client.execute("SELECT product_code, name, logo_image FROM supplier_products WHERE logo_image IS NOT NULL AND logo_image != '' LIMIT 3");
    if (logoSamples.rows.length > 0) {
        console.log("\n--- logo_image samples ---");
        for (const row of logoSamples.rows) { console.log("  ["+row.product_code+"] "+row.name); console.log("    logo: "+row.logo_image); }
    }

    const labelSamples = await client.execute("SELECT product_code, name, label_image FROM supplier_products WHERE label_image IS NOT NULL AND label_image != '' LIMIT 3");
    if (labelSamples.rows.length > 0) {
        console.log("\n--- label_image samples ---");
        for (const row of labelSamples.rows) { console.log("  ["+row.product_code+"] "+row.name); console.log("    label: "+row.label_image); }
    }

    // Section 3
    console.log("\n" + eq);
    console.log("[3] image_urls count distribution");
    console.log(eq);

    const sortedDist = Object.entries(imageCountDist).sort((a, b) => Number(a[0]) - Number(b[0]));
    let totalImages = 0, totalProducts = 0;
    console.log("");
    for (const [count, products] of sortedDist) {
        const bar = "#".repeat(Math.min(products, 50));
        console.log("  " + count.toString().padStart(3) + " images: " + products.toString().padStart(4) + " products " + bar);
        totalImages += Number(count) * products;
        totalProducts += products;
    }
    if (totalProducts > 0) console.log("\n  Average: " + (totalImages / totalProducts).toFixed(1) + " images/product");

    // Section 4
    console.log("\n" + eq);
    console.log("[4] Sample 3 products - full image_urls JSON");
    console.log(eq);

    const sampleProducts = await client.execute("SELECT product_code, name, image_urls, logo_image, label_image FROM supplier_products WHERE image_urls IS NOT NULL AND image_urls != '' LIMIT 200");
    const withCounts = [];
    for (const row of sampleProducts.rows) {
        try {
            const parsed = JSON.parse(row.image_urls);
            const count = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;
            withCounts.push({ pc: row.product_code, name: row.name, logo_image: row.logo_image, label_image: row.label_image, imageCount: count, parsed });
        } catch {
            withCounts.push({ pc: row.product_code, name: row.name, logo_image: row.logo_image, label_image: row.label_image, imageCount: 0, parsed: null });
        }
    }
    withCounts.sort((a, b) => b.imageCount - a.imageCount);
    const idxs = [0, Math.floor(withCounts.length / 2), withCounts.length - 1];
    const lbls = ["Most images", "Middle", "Fewest images"];
    for (let i = 0; i < idxs.length; i++) {
        const s = withCounts[idxs[i]];
        if (!s) continue;
        console.log("\n--- " + lbls[i] + " ---");
        console.log("  product_code: " + s.pc);
        console.log("  Name: " + s.name);
        console.log("  Image count: " + s.imageCount);
        console.log("  logo_image: " + (s.logo_image || "(none)"));
        console.log("  label_image: " + (s.label_image || "(none)"));
        console.log("  image_urls:");
        console.log(JSON.stringify(s.parsed, null, 2));
    }

    // Section 5
    console.log("\n" + eq);
    console.log("[5] label/logo keys in image_urls");
    console.log(eq);

    const labelLogoKeys = Object.entries(keyFrequency).filter(([key]) => key.toLowerCase().includes("label") || key.toLowerCase().includes("logo")).sort((a, b) => b[1] - a[1]);
    if (labelLogoKeys.length > 0) {
        console.log("");
        for (const [key, count] of labelLogoKeys) console.log("  " + key + ": " + count + " products");
        console.log("\n--- label/logo key URL samples ---");
        let sc = 0;
        for (const row of allRows.rows) {
            if (sc >= 5) break;
            try {
                const parsed = JSON.parse(row.image_urls);
                if (typeof parsed === "object" && !Array.isArray(parsed)) {
                    for (const key of Object.keys(parsed)) {
                        if (key.toLowerCase().includes("label") || key.toLowerCase().includes("logo")) {
                            console.log("  ["+row.product_code+"] "+row.name);
                            console.log("    "+key+": "+parsed[key]);
                            sc++;
                            break;
                        }
                    }
                }
            } catch {}
        }
    } else {
        console.log("\nNo label/logo keys found");
    }

    client.close();
    console.log("\n" + eq);
    console.log("Analysis complete");
    console.log(eq);
}

analyze().catch(err => { console.error("Error:", err); client.close(); });
