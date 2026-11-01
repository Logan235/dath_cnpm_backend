// Tiếp nhận mẫu tin vào hệ thống (từ crawler, người dân phản ánh, nhập tay...)
import { Repository } from 'typeorm';
import { AdItem } from '../entities';
import { contentHash, pad } from '../common/utils/text';

export interface IntakeItem {
  content: string;
  title?: string;
  sourceUrl?: string;
  authorName?: string;
  authorAccount?: string;
  platform?: string;
  dataFormat?: string;
  media?: any[];
  likes?: number;
  shares?: number;
  views?: number;
  comments?: number;
  publishedAt?: string | Date | null;
}

export async function createAdItems(
  repo: Repository<AdItem>,
  items: IntakeItem[],
  common: Partial<AdItem>,
): Promise<AdItem[]> {
  const out: AdItem[] = [];
  for (const it of items) {
    const saved = await repo.save(
      repo.create({
        ...common,
        content: it.content,
        title: it.title,
        sourceUrl: it.sourceUrl,
        authorName: it.authorName,
        authorAccount: it.authorAccount,
        platform: it.platform ?? common.platform,
        dataFormat: it.dataFormat ?? (it.media?.length ? 'MIXED' : 'TEXT'),
        media: it.media ?? [],
        likes: it.likes ?? 0,
        shares: it.shares ?? 0,
        views: it.views ?? 0,
        comments: it.comments ?? 0,
        publishedAt: it.publishedAt ? new Date(it.publishedAt) : null,
        contentHash: contentHash(it.content),
        status: 'COLLECTED',
      }),
    );
    saved.code = `MT-${pad(saved.id, 6)}`;
    await repo.update(saved.id, { code: saved.code });
    out.push(saved);
  }
  return out;
}
