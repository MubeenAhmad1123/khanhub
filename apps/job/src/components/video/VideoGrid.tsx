import VideoCard from './VideoCard';
import { cn } from '@/lib/utils';

interface VideoGridProps {
    items: Array<{
        id: string;
        seekerId: string;
        role: 'jobseeker' | 'employer';
        industry: string;
        subcategory: string;
        videoUrl?: string;
    }>;
    className?: string;
}

export default function VideoGrid({ items, className }: VideoGridProps) {
    return (
        <div className={cn(
            "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
            className
        )}>
            {items.map((video, idx) => (
                <VideoCard
                    key={video.id + idx}
                    seekerId={video.seekerId}
                    role={video.role}
                    industry={video.industry}
                    subcategory={video.subcategory}
                    videoUrl={video.videoUrl}
                />
            ))}
        </div>
    );
}
