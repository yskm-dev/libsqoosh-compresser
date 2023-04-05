import { ImagePool } from '@squoosh/lib';
import { cpus } from 'os';
import glob from 'glob';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import path from 'path';
import fse from 'fs-extra';

const imagePool = new ImagePool(cpus().length);

//画像のフォルダ設定
const IMAGE_DIR = 'image';
const OUTPUT_DIR = './dist';

// 圧縮時のオプション設定
const ENCODE_WITH_TYPE = {
  jpg: 'mozjpeg',
  png: 'oxipng',
  webp: 'webp'
};

const ENCODE_OPTION = {
  jpg: {
    mozjpeg: { quality: 75 }
  },
  png: {
    oxipng: {
      effort: 2
    }
  },
  webp: {
    webp: {
      lossless: 1
    }
  }
};

// JPEGの圧縮オプション
const jpgEncodeOptions = {
  mozjpeg: { quality: 75 }
};

// PNGの圧縮オプション
const pngEncodeOptions = {
  oxipng: {
    effort: 2
  }
};

// 画像フォルダ内のファイルを抽出
const imageFileList = [];
glob.sync(IMAGE_DIR + '/**/*.*').map(function (file) {
  imageFileList.push(file.replace(IMAGE_DIR, '.'));
});

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR);
}

await Promise.all(
  imageFileList.map(async (imagePath) => {
    const fileExtension = path.extname(imagePath).substring(1);
    const sourcePath = path.join(IMAGE_DIR, imagePath);
    const destinationPath = path.join(OUTPUT_DIR, imagePath);

    if (fileExtension === 'png' || fileExtension === 'jpg') {
      // JPEGならmozjpg、PNGならoxipngで圧縮
      const rawImageFile = await fse.readFile(sourcePath);
      const ingestedImage = imagePool.ingestImage(rawImageFile);

      await ingestedImage.encode(ENCODE_OPTION[fileExtension]);
      const encodedImage = await ingestedImage.encodedWith[ENCODE_WITH_TYPE[fileExtension]];
      await fse.outputFile(destinationPath, encodedImage.binary);
      console.log(`\x1b[0mcompress : \x1b[31m${sourcePath}`);

      // WebPに変換する
      await ingestedImage.encode(ENCODE_OPTION.webp);
      const encodedImageWebp = await ingestedImage.encodedWith.webp;
      const destinationPathWebp = destinationPath + '.webp';
      await fse.outputFile(destinationPathWebp, encodedImageWebp.binary);
      console.log(`\x1b[0mCreate WebP : \x1b[31m${sourcePath}`);
    } else {
      // それ以外はただコピーを作る
      await copyFileSync(sourcePath, destinationPath);
      console.log(`\x1b[0mCopy : \x1b[31m${sourcePath}`);
    }
  })
);

// imagePoolを閉じる
await imagePool.close();
console.log(`\x1b[32mSphoosh!`);
