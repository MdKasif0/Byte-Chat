"use client";

import React from "react";
import Image from "next/image";
import { saveAs } from "file-saver";
import { X, Download, File as FileIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import type { Message } from "@/lib/types";
import { Button } from "../ui/button";

type MediaViewerProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  mediaItems: Message[];
  startIndex: number;
};

export default function MediaViewer({ isOpen, setIsOpen, mediaItems, startIndex }: MediaViewerProps) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;
    
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });

    if(isOpen) {
        api.scrollTo(startIndex, true);
    }
  }, [api, isOpen, startIndex]);

  const currentItem = mediaItems[current];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl w-full h-[90vh] bg-black/90 border-none p-0 flex flex-col text-white">
        <DialogHeader className="p-4 flex flex-row items-center justify-between text-white">
          <DialogTitle>
            {currentItem?.fileName || "Media"}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => saveAs(currentItem.fileURL!, currentItem.fileName)}
              className="text-white hover:bg-white/20 hover:text-white"
            >
              <Download className="h-5 w-5" />
            </Button>
            <DialogClose asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white">
                    <X className="h-5 w-5" />
                </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="flex-1 flex items-center justify-center p-4 h-full min-h-0">
          <Carousel setApi={setApi} className="w-full h-full">
            <CarouselContent className="h-full">
              {mediaItems.map((item) => (
                <CarouselItem key={item.id} className="h-full flex items-center justify-center">
                  {item.fileType?.startsWith("image/") ? (
                    <div className="relative w-full h-full">
                        <Image
                            src={item.fileURL!}
                            alt={item.fileName || "image"}
                            layout="fill"
                            objectFit="contain"
                        />
                    </div>
                  ) : item.fileType?.startsWith("video/") ? (
                    <video
                      src={item.fileURL!}
                      controls
                      className="max-w-full max-h-full"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-white">
                        <FileIcon className="h-24 w-24" />
                        <p>Unsupported file type for preview.</p>
                        <p className="text-sm text-white/70">{item.fileName}</p>
                    </div>
                  )}
                </CarouselItem>
              ))}
            </CarouselContent>
            {mediaItems.length > 1 && (
                <>
                    <CarouselPrevious className="text-white hover:bg-white/20 hover:text-white left-2" />
                    <CarouselNext className="text-white hover:bg-white/20 hover:text-white right-2" />
                </>
            )}
          </Carousel>
        </div>
      </DialogContent>
    </Dialog>
  );
}
