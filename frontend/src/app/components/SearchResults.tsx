"use client";

import type { SearchResults as SearchResultsType } from "../../lib/types";

type Props = {
  searchResults: SearchResultsType;
};

export default function SearchResults({ searchResults }: Props) {
  return (
    <div className="mt-2 max-h-[calc(100vh-120px)] overflow-y-auto">
      {searchResults.users.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-semibold text-neutral-600">ユーザー</h3>
          <div className="space-y-2">
            {searchResults.users.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.location.href = `/profile/${user.username}`;
                  }
                }}
                className="w-full rounded-md border border-neutral-200 p-2 text-left hover:bg-neutral-50"
              >
                <div className="text-sm font-semibold">{user.name}</div>
                <div className="text-xs text-neutral-600">@{user.username}</div>
              </button>
            ))}
          </div>
        </div>
      )}
      {searchResults.posts.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold text-neutral-600">投稿</h3>
          <div className="space-y-2">
            {searchResults.posts.map((post) => (
              <button
                key={post.id}
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.location.href = `/post/${post.id}`;
                  }
                }}
                className="w-full rounded-md border border-neutral-200 p-2 text-left hover:bg-neutral-50"
              >
                <div className="text-xs text-neutral-600">
                  {post.author.name} @{post.author.username}
                </div>
                <div className="mt-1 text-sm line-clamp-2">{post.content}</div>
              </button>
            ))}
          </div>
        </div>
      )}
      {searchResults.users.length === 0 && searchResults.posts.length === 0 && (
        <p className="text-center text-sm text-neutral-600">結果が見つかりませんでした</p>
      )}
    </div>
  );
}
