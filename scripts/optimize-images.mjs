/**
 * 城市图片批量优化脚本
 *
 * 输入：public/city/{城市}/{原图}.jpg
 * 输出：public/city-opt/{城市}/{原图}.jpg        — 桌面端渐进式 JPEG（1920px 宽）
 *       public/city-opt/{城市}/{原图}.webp       — 桌面端 WebP（1920px 宽）
 *       public/city-opt/{城市}/{原图}.mobile.jpg  — 手机端渐进式 JPEG（960px 宽）
 *       public/city-opt/{城市}/{原图}.mobile.webp — 手机端 WebP（960px 宽）
 *
 * 不修改原始文件。
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, '../public/city');
const OUT_DIR = path.resolve(__dirname, '../public/city-opt');

const DESKTOP_WIDTH = 1920;
const MOBILE_WIDTH = 960;
const WEBP_QUALITY = 95;
const JPEG_QUALITY = 92;

async function processImage(srcPath, outDir, baseName) {
  const meta = await sharp(srcPath).metadata();
  const origW = meta.width;
  const origH = meta.height;
  const origSize = fs.statSync(srcPath).size;

  const results = [];

  for (const [label, maxDim] of [['desktop', DESKTOP_WIDTH], ['mobile', MOBILE_WIDTH]]) {
    const suffix = label === 'mobile' ? '.mobile' : '';

    // 统一按宽度 resize，withoutEnlargement 防止小图被放大
    const resized = sharp(srcPath).resize({
      width: maxDim,
      withoutEnlargement: true,
    });

    // WebP
    const webpPath = path.join(outDir, `${baseName}${suffix}.webp`);
    await resized.clone().webp({ quality: WEBP_QUALITY, effort: 6 }).toFile(webpPath);
    const webpSize = fs.statSync(webpPath).size;

    // Progressive JPEG
    const jpgPath = path.join(outDir, `${baseName}${suffix}.jpg`);
    await resized.clone().jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true }).toFile(jpgPath);
    const jpgSize = fs.statSync(jpgPath).size;

    results.push({ label, webpSize, jpgSize });
  }

  return { origW, origH, origSize, results };
}

async function main() {
  const folders = fs.readdirSync(SRC_DIR).filter(f =>
    fs.statSync(path.join(SRC_DIR, f)).isDirectory()
  );

  let totalOrigMB = 0;
  let totalWebpDesktopMB = 0;
  let totalJpgDesktopMB = 0;
  let totalWebpMobileMB = 0;
  let totalJpgMobileMB = 0;
  let count = 0;

  console.log('开始处理...\n');
  console.log('城市/文件'.padEnd(55) + '原始'.padEnd(12) + '桌面WebP'.padEnd(12) + '桌面JPG'.padEnd(12) + '手机WebP'.padEnd(12) + '手机JPG');
  console.log('─'.repeat(103));

  for (const folder of folders) {
    const srcFolder = path.join(SRC_DIR, folder);
    const outFolder = path.join(OUT_DIR, folder);
    fs.mkdirSync(outFolder, { recursive: true });

    const files = fs.readdirSync(srcFolder).filter(f => f.endsWith('.jpg'));

    for (const file of files) {
      const srcPath = path.join(srcFolder, file);
      const baseName = path.basename(file, '.jpg');

      try {
        const { origW, origH, origSize, results } = await processImage(srcPath, outFolder, baseName);
        count++;

        const origMB = origSize / 1048576;
        const desk = results.find(r => r.label === 'desktop');
        const mob = results.find(r => r.label === 'mobile');

        const dWebpMB = desk.webpSize / 1048576;
        const dJpgMB = desk.jpgSize / 1048576;
        const mWebpMB = mob.webpSize / 1048576;
        const mJpgMB = mob.jpgSize / 1048576;

        totalOrigMB += origMB;
        totalWebpDesktopMB += dWebpMB;
        totalJpgDesktopMB += dJpgMB;
        totalWebpMobileMB += mWebpMB;
        totalJpgMobileMB += mJpgMB;

        const shortName = `${folder}/${file.substring(0, 40)}`;
        console.log(
          shortName.padEnd(55) +
          `${origMB.toFixed(2)}MB`.padEnd(12) +
          `${dWebpMB.toFixed(2)}MB`.padEnd(12) +
          `${dJpgMB.toFixed(2)}MB`.padEnd(12) +
          `${mWebpMB.toFixed(2)}MB`.padEnd(12) +
          `${mJpgMB.toFixed(2)}MB`
        );
      } catch (err) {
        console.error(`  ✗ 处理失败: ${folder}/${file} — ${err.message}`);
      }
    }
  }

  console.log('─'.repeat(103));
  console.log(
    `合计 (${count} 张)`.padEnd(55) +
    `${totalOrigMB.toFixed(1)}MB`.padEnd(12) +
    `${totalWebpDesktopMB.toFixed(1)}MB`.padEnd(12) +
    `${totalJpgDesktopMB.toFixed(1)}MB`.padEnd(12) +
    `${totalWebpMobileMB.toFixed(1)}MB`.padEnd(12) +
    `${totalJpgMobileMB.toFixed(1)}MB`
  );

  const savedPct = ((1 - totalWebpDesktopMB / totalOrigMB) * 100).toFixed(1);
  console.log(`\n桌面端 WebP 总节省: ${savedPct}%`);
  console.log(`手机端 WebP 总节省: ${((1 - totalWebpMobileMB / totalOrigMB) * 100).toFixed(1)}%`);
  console.log(`\n输出目录: ${OUT_DIR}`);
}

main().catch(console.error);
