"use client";

import { fillContentTokens } from "@/data/career";
import { useSiteContent } from "./ContentProvider";
import { ArrowUp } from "./Icons";

/** 版权行占位符替换：{year} / {years} / {since} / {name} */
function renderCopyright(template: string, name: string) {
  return fillContentTokens(template, { name });
}

export default function Footer() {
  const { profile, copy } = useSiteContent();

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <span>{renderCopyright(copy.footer.copyright, profile.name)}</span>
        <span>
          {copy.footer.builtWithLabel}{" "}
          {copy.footer.stack.map((tech, i) => (
            <span key={tech}>
              {i > 0 && " · "}
              <code>{tech}</code>
            </span>
          ))}
        </span>
        <a className="to-top" href="#hero">
          {copy.footer.backToTop}
          <ArrowUp />
        </a>
      </div>
    </footer>
  );
}
