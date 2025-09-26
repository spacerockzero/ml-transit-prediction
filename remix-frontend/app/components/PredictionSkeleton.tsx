import { Skeleton } from "~/components/ui/skeleton";

export function PredictionSkeleton() {
  const carriers = ['usps', 'ups', 'fedex'];

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <Skeleton className="h-6 w-64" />
      </div>

      {carriers.map((carrier, index) => (
        <div key={carrier} className={`bg-white border rounded-lg p-4 shadow-sm animate-pulse carrier-${carrier}`}>
          <div className="flex items-center justify-between mb-3">
            {/* Match h4 with text-lg font-semibold */}
            <div className="text-lg font-semibold">
              <Skeleton className="h-7 w-12" />
            </div>
            {index === 0 && (
              <div className="text-xs px-2 py-1">
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-3 rounded-md">
              {/* Match text-xs */}
              <div className="text-xs font-medium mb-1">
                <Skeleton className="h-3 w-20" />
              </div>
              {/* Match text-lg font-bold */}
              <div className="text-lg font-bold">
                <Skeleton className="h-7 w-14" />
              </div>
            </div>

            <div className="bg-green-50 p-3 rounded-md">
              {/* Match text-xs */}
              <div className="text-xs font-medium mb-1">
                <Skeleton className="h-3 w-20" />
              </div>
              {/* Match text-lg font-bold */}
              <div className="text-lg font-bold">
                <Skeleton className="h-7 w-12" />
              </div>
            </div>
          </div>
        </div>
      ))}

    </div>
  );
}
