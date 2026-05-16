import { Plus, Leaf, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtAUD } from "@/lib/api";

export default function MenuItemCard({ item, onAdd }) {
  return (
    <div
      data-testid={`menu-item-${item.id}`}
      className="group relative flex flex-col bg-white border border-chaioz-line rounded-2xl overflow-hidden hover:border-chaioz-saffron/60 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
    >
      {item.image && (
        // Aspect-ratio keeps the image proportional on every screen size —
        // mobile (single-column / full-width card), tablet, desktop — so
        // photos don't get cropped weirdly or stretched. 4:3 matches the
        // shape of typical food photography.
        <div className="relative aspect-[4/3] overflow-hidden bg-chaioz-cream">
          <img
            src={item.image}
            alt={item.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-chaioz-teal/40 via-transparent to-transparent" />
          <div className="absolute top-3 left-3 flex gap-2">
            {item.is_bestseller && (
              <span className="bg-chaioz-saffron text-chaioz-teal text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full inline-flex items-center gap-1">
                <Star className="w-3 h-3" /> Bestseller
              </span>
            )}
            {item.is_vegan && (
              <span className="bg-chaioz-cream text-chaioz-teal text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full inline-flex items-center gap-1">
                <Leaf className="w-3 h-3" /> Vegan
              </span>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 p-3 sm:p-5 flex flex-col">
        <h3 className="font-serif text-base sm:text-xl text-chaioz-teal mb-1 line-clamp-2">{item.name}</h3>
        <p className="text-xs text-chaioz-teal/65 leading-relaxed line-clamp-2 mb-3 sm:mb-4 flex-1">
          {item.description}
        </p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-base sm:text-lg font-medium text-chaioz-teal" data-testid={`menu-item-price-${item.id}`}>
            {fmtAUD(item.price)}
          </span>
          <Button
            size="sm"
            onClick={() => onAdd(item)}
            data-testid={`menu-item-add-${item.id}`}
            className="bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal rounded-full h-8 px-3 text-xs sm:text-sm"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}
