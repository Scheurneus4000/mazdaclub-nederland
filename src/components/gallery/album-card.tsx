import Image from "next/image";
import Link from "next/link";
import { Camera, Images } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

export type AlbumCardData = {
  slug: string;
  title: string;
  date: Date;
  photoCount: number;
  coverUrl: string | null;
  eventTitle?: string | null;
};

export function AlbumCard({ album, className }: { album: AlbumCardData; className?: string }) {
  return (
    <article className={cn("group relative overflow-hidden rounded-2xl bg-ink text-white", className)}>
      <div className="relative aspect-[4/3] overflow-hidden">
        {album.coverUrl ? (
          <Image
            src={album.coverUrl}
            alt={album.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-ink to-primary/60">
            <Camera className="size-10 text-white/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
          <Images className="size-3.5" /> {album.photoCount} foto{album.photoCount === 1 ? "" : "'s"}
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{formatDate(album.date)}</p>
        <h3 className="mt-1.5 font-display text-xl font-bold uppercase leading-tight tracking-tight">
          <Link href={`/fotogalerij/${album.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {album.title}
          </Link>
        </h3>
        {album.eventTitle && <p className="mt-1.5 line-clamp-1 text-sm text-white/70">Bij: {album.eventTitle}</p>}
        <span className="mt-4 block h-0.5 w-10 bg-primary transition-all duration-500 group-hover:w-20" />
      </div>
    </article>
  );
}
