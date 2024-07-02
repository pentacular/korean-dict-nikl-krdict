import { readdir, readFile, writeFile } from 'node:fs/promises';

import { parseStringPromise as parseXml } from 'xml2js';

const load = async () => {
  const xml = await readFile('5000.xml', { encoding: 'utf-8' });
  const json = await parseXml(xml);
  await writeFile('5000.json', JSON.stringify(json, null, 2), { flag: 'w+' });
};

const isGood = (feature) => {
  if (feature.lexicalUnit !== '단어') {
    return false;
  }
  if (['접사', '품사 없음'].includes(feature.partOfSpeech)) {
    return false;
  }
  return true;
};

const process = async (file, words) => {
  const utf8 = await readFile(file, { encoding: 'utf-8' });
  const data = await parseXml(utf8);
  for (const lexicon of data.LexicalResource.Lexicon) {
    for (const entry of lexicon.LexicalEntry) {
      const feature = {};
      if (!entry.feat) {
        continue;
      }
      for (const { $ } of entry.feat) {
        const { att, val } = $;
        feature[att] = val;
      }
      for (const sense of entry.Sense) {
        if (!sense.Equivalent) {
          continue;
        }
        for (const equivalent of sense.Equivalent) {
          const field = {};
          for (const { $ } of equivalent.feat) {
            const { att, val } = $;
            field[att] = val;
          }
          if (field.language === '영어') {
            feature.english = field.definition;
          }
        }
      }
      for (const lemma of entry.Lemma) {
        for (const feat of lemma.feat) {
          const { $ } = feat;
          const { att, val } = $;
          if (att === 'writtenForm') {
            const { english, vocabularyLevel } = feature;
            if (!isGood(feature)) {
              continue;
            }
            words.push({ level: vocabularyLevel, korean: val, english });
          }
        }
      }
    }
  }
};

const run = async () => {
  const words = []
  await process
  for (const file of await readdir('.')) {
    if (file.endsWith('.xml')) {
      await process(file, words);
    }
  }
  await writeFile('out.json', JSON.stringify(words, null, 2), { encoding: 'utf-8', flag: 'w+' });
}

run();
