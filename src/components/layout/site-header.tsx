import { Link } from '@tanstack/react-router'
import { Menu, Search, ShoppingBasket, Store } from 'lucide-react'

import { BrandMark } from '../brand/brand-mark'

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link aria-label="BenchBazaar home" className="site-logo" to="/">
          <BrandMark />
        </Link>

        <nav aria-label="Primary navigation" className="desktop-nav">
          <Link
            activeProps={{ 'aria-current': 'page' }}
            className="nav-link"
            to="/browse"
          >
            Browse
          </Link>
          <Link className="nav-link" search={{ sort: 'newest' }} to="/browse">
            Fresh
          </Link>
          <Link
            activeProps={{ 'aria-current': 'page' }}
            className="nav-link"
            to="/about"
          >
            About
          </Link>
        </nav>

        <div className="site-header__actions">
          <form action="/browse" className="header-search" role="search">
            <Search aria-hidden="true" size={17} />
            <label className="sr-only" htmlFor="header-search">
              Search benchmarks
            </label>
            <input
              autoComplete="off"
              id="header-search"
              name="q"
              placeholder="Search the shelves"
              type="search"
            />
          </form>
          <Link
            aria-label="Browse saved benchmarks"
            className="icon-button desktop-only"
            to="/browse"
          >
            <ShoppingBasket aria-hidden="true" size={20} />
          </Link>
          <Link className="button button--ink desktop-only" to="/publish">
            <Store aria-hidden="true" size={17} />
            Publish
          </Link>

          <details className="mobile-menu">
            <summary aria-label="Open navigation">
              <Menu aria-hidden="true" size={23} />
            </summary>
            <nav aria-label="Mobile navigation" className="mobile-menu__panel">
              <Link className="mobile-menu__link" to="/browse">
                Browse
              </Link>
              <Link
                className="mobile-menu__link"
                search={{ sort: 'newest' }}
                to="/browse"
              >
                Fresh
              </Link>
              <Link className="mobile-menu__link" to="/about">
                About
              </Link>
              <Link className="mobile-menu__link" to="/publish">
                Publish a benchmark
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  )
}
