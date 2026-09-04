import { SocialFeedSkeleton } from "@/components/social-feed";

export default function CommunityLoading() {
  return <div className="community-page"><div className="community-masthead community-masthead-skeleton" /><SocialFeedSkeleton /></div>;
}
