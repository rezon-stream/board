export const Chat = ({ videoId }: { videoId: string }) => (
  // Wrapper because a bare iframe keeps its intrinsic 150px height instead of stretching.
  <div className="chat">
    <iframe
      title="Чат трансляции"
      // YouTube refuses the embed unless embed_domain matches the page host.
      src={`https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${location.hostname}&dark_theme=1`}
    />
  </div>
);
