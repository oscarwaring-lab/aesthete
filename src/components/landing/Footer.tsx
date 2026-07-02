/** Landing footer — brand + Product / Company / Connect columns. Product links
 * are real plate anchors; Company/Connect are placeholders pending real pages. */
export function Footer() {
  return (
    <footer>
      <div className="foot-top">
        <div className="foot-brand">
          <div className="wm">
            <span
              style={{
                border: '1px solid var(--ink)',
                width: '30px',
                height: '30px',
                display: 'grid',
                placeItems: 'center',
                fontSize: '17px',
              }}
            >
              Æ
            </span>{' '}
            Aesthete
          </div>
          <p>
            Your visual identity, codified. An AI creative director for lifestyle
            and personal-brand creators.
          </p>
        </div>
        <div className="foot-cols">
          <div className="foot-col">
            <h4>Product</h4>
            <a href="#report">The Report</a>
            <a href="#process">Process</a>
            <a href="#features">Features</a>
            <a href="#studio">Studio</a>
          </div>
          <div className="foot-col">
            <h4>Company</h4>
            <a href="#">About</a>
            <a href="#">Journal</a>
            <a href="#">Contact</a>
          </div>
          <div className="foot-col">
            <h4>Connect</h4>
            <a href="#">Instagram</a>
            <a href="#">Email</a>
          </div>
        </div>
      </div>
      <div className="foot-bottom">
        <span className="meta">© 2026 Aesthete · Aesthetic DNA</span>
        <span className="meta">getaesthete.com</span>
      </div>
    </footer>
  )
}
