import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'

import { BrandMark } from '../brand/brand-mark'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__about">
          <BrandMark />
          <p>
            An open registry for unusual, useful LLM benchmarks—built with
            public methods, sealed scored sets, and receipts for every result.
          </p>
        </div>
        <div className="site-footer__links">
          <div>
            <p className="footer-heading">Explore</p>
            <Link to="/browse">Browse benchmarks</Link>
            <Link to="/publish">Publish a benchmark</Link>
            <Link to="/about">How it works</Link>
          </div>
          <div>
            <p className="footer-heading">Built in the open</p>
            <a
              href="https://github.com/felixlaga/BenchBazaar"
              rel="noreferrer"
              target="_blank"
            >
              GitHub <ArrowUpRight aria-hidden="true" size={14} />
            </a>
            <a
              href="https://github.com/felixlaga/BenchBazaar/security/advisories/new"
              rel="noreferrer"
              target="_blank"
            >
              Report a security issue
            </a>
          </div>
        </div>
      </div>
      <div className="site-footer__bottom">
        <span>© {new Date().getUTCFullYear()} BenchBazaar</span>
        <span>Odd tests. Useful signals.</span>
      </div>
    </footer>
  )
}
