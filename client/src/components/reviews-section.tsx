import { useQuery } from "@tanstack/react-query";
import { Review } from "@shared/schema";
import { Star } from "lucide-react";
import { format } from "date-fns";

interface ReviewsSectionProps {
  serviceId: number;
}

export function ReviewsSection({ serviceId }: ReviewsSectionProps) {
  const { data: reviews, isLoading } = useQuery<Review[]>({
    queryKey: ["/api/services", serviceId, "reviews"],
    queryFn: async () => {
      const response = await fetch(`/api/services/${serviceId}/reviews`);
      if (!response.ok) {
        throw new Error(`Failed to fetch reviews: ${response.statusText}`);
      }
      return response.json();
    },
  });

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>;
  }

  if (!reviews?.length) {
    return <p className="text-gray-500">No reviews yet. Be the first to review!</p>;
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div key={review.id} className="border rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < review.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-500">
                {format(new Date(review.createdAt), "MMMM d, yyyy")}
              </p>
            </div>
            {review.verified && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Verified Review
              </span>
            )}
          </div>
          <p className="text-gray-700">{review.review}</p>
        </div>
      ))}
    </div>
  );
}
