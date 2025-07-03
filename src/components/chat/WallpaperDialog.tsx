"use client";

import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { updateChatWallpaper } from "@/lib/chat";

const WALLPAPERS = [
  { name: "Default", url: "" },
  { name: "Geometry", url: "https://placehold.co/1080x1920/E8E8E8/AAAAAA/png?text=+" },
  { name: "Mountains", url: "https://placehold.co/1080x1920/a3abbc/ffffff/png?text=+" },
  { name: "Forest", url: "https://placehold.co/1080x1920/3d5e4a/ffffff/png?text=+" },
  { name: "Galaxy", url: "https://placehold.co/1080x1920/1c1c3c/ffffff/png?text=+" },
  { name: "Abstract", url: "https://placehold.co/1080x1920/f4a261/264653/png?text=+" },
];

type WallpaperDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  chatId: string;
};

export default function WallpaperDialog({ isOpen, onOpenChange, chatId }: WallpaperDialogProps) {
  const { toast } = useToast();

  const handleSelectWallpaper = async (url: string) => {
    try {
      await updateChatWallpaper(chatId, url);
      toast({ title: "Wallpaper updated!" });
      onOpenChange(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not update wallpaper." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Wallpaper</DialogTitle>
          <DialogDescription>Select a new background for this chat.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4 max-h-[60vh] overflow-y-auto">
          {WALLPAPERS.map((wallpaper) => (
            <button
              key={wallpaper.name}
              onClick={() => handleSelectWallpaper(wallpaper.url)}
              className="relative aspect-[9/16] rounded-md overflow-hidden group border-2 border-transparent hover:border-primary focus:border-primary focus:outline-none"
            >
              <Image
                src={wallpaper.url || "https://placehold.co/1080x1920.png"}
                alt={wallpaper.name}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform"
                data-ai-hint={wallpaper.name !== "Default" ? wallpaper.name.toLowerCase() : "pattern"}
              />
              <div className="absolute inset-0 bg-black/20" />
              <p className="absolute bottom-2 left-2 text-white font-semibold text-sm bg-black/50 px-2 py-1 rounded">
                {wallpaper.name}
              </p>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
