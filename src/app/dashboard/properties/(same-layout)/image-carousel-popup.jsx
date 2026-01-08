import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Carousel } from "@/components/ui/carousel";
import {
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Image from "next/image";

export function ImageCarouselPopup({ isOpen, onClose, images, propertyName }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{propertyName}</DialogTitle>
        </DialogHeader>
        <Carousel className="w-full max-w-xs mx-auto">
          <CarouselContent>
            {images.map((image, index) => (
              <CarouselItem key={index}>
                <div className="p-1">
                  <Image
                    src={image || "/placeholder.svg"}
                    alt={`Property image ${index + 1}`}
                    width={400}
                    height={300}
                    className="w-full object-cover rounded-md"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}
