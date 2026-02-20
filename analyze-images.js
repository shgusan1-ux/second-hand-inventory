const { createClient } = require('@libsql/client');
const client = createClient({
  url: 'libsql://second-hand-inventory-shgusan1-ux.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDIyNjYwNDQsImlhdCI6MTc3MDczMDA0NCwiaWQiOiI5NWQ2ZWVmNC05MGQ2LTQ3ZDYtYTNlZi0wMzFmYTkzOGYyNGMiLCJyaWQiOiJmYWUyYjI4Yy0zM2I5LTQ2OGItYmEwOS1lMmY3NTQxYjQ5ODYifQ.l1mNE_w5wXuLTm5OhVrG-YI4gBlYHTL-D4BZxMbnsT_z4kqeKHAspRbPThXRnXL6kH-wcy5n5fUmjvROKjGIDA'
});
async function analyze() {
  const sep = '='.repeat(80);
  console.log(sep);
  console.log('supplier_products image analysis');
  console.log(sep);

  const total = await client.execute('SELECT COUNT(*) as cnt FROM supplier_products');
  console.log('\n--- [1] Total: ' + total.rows[0].cnt);

  const imgStats = await client.execute("SELECT COUNT(*) as total, SUM(CASE WHEN image_urls IS NOT NULL AND image_urls != '' AND image_urls != '[]' THEN 1 ELSE 0 END) as has_images, SUM(CASE WHEN image_urls IS NULL OR image_urls = '' OR image_urls = '[]' THEN 1 ELSE 0 END) as no_images FROM supplier_products");
  console.log('\n--- [2] image_urls ---');
  console.log('  total: ' + imgStats.rows[0].total + ', has: ' + imgStats.rows[0].has_images + ', no: ' + imgStats.rows[0].no_images);