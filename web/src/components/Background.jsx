// Page background: reeded glass with orange light behind it (pure CSS, see ".bg" in styles.css).
export default function Background() {
  return (
    <div className="bg" aria-hidden="true">
      <i className="bg-base" /><i className="bg-shift" /><i className="bg-ribs" /><i className="bg-grain" />
    </div>
  );
}
