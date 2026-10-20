import type { Metadata, Viewport } from "next";
import siteConfig from "@/data/site.config";
import "./globals.css";

const { profile, seo, theme } = siteConfig;

/** 站点主域名非法时退回占位，避免 build 直接崩掉 */
function safeBaseUrl(input: string): URL {
  try {
    return new URL(input || "https://example.com");
  } catch {
    return new URL("https://example.com");
  }
}

const roleTitle = profile.roles[0] ?? "";

export const metadata: Metadata = {
  metadataBase: safeBaseUrl(seo.siteUrl),
  title: `${profile.name} · ${roleTitle} | 个人门户`,
  description:
    seo.description || `${profile.name}的个人门户 —— ${profile.tagline} ${profile.bio[0] ?? ""}`,
  keywords: [profile.name, ...profile.roles, ...profile.keywords, ...seo.keywords],
  authors: [{ name: profile.name }],
  alternates: { canonical: "/" },
  openGraph: {
    title: `${profile.name} · ${roleTitle}`,
    description: seo.description || profile.tagline,
    type: "website",
    locale: "zh_CN",
    siteName: `${profile.name}${siteConfig.copy.nav.logoSuffix}`,
    images: [{ url: seo.ogImage, width: 1200, height: 630, alt: profile.name }],
  },
  twitter: {
    card: seo.twitterCard,
    title: `${profile.name} · ${roleTitle}`,
    description: seo.description || profile.tagline,
    images: [seo.ogImage],
  },
  robots: { index: seo.indexable, follow: seo.indexable },
};

export const viewport: Viewport = {
  themeColor: theme.bg,
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: roleTitle,
    email: `mailto:${profile.email}`,
    description: profile.tagline,
    address: { "@type": "PostalAddress", addressLocality: profile.location },
    sameAs: profile.socials.filter((s) => s.href.startsWith("http")).map((s) => s.href),
  };

  // 主题色由配置注入；用 html:root 提高优先级，确保覆盖 globals.css 里的默认值
  const themeCss = `html:root{--bg:${theme.bg};--ink:${theme.ink};--cyan:${theme.cyan};--magenta:${theme.magenta};--violet:${theme.violet};--amber:${theme.amber}}`;

  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&family=Noto+Sans+SC:wght@300;400;500;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* 无 JS 时保证内容可读（进场动画默认 opacity:0） */}
        <noscript>
          <style>{`.reveal{opacity:1!important;transform:none!important}.loader{display:none!important}`}</style>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
