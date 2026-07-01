import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import type { ReactNode } from "react";
import "nextra-theme-docs/style.css";

export const metadata = {
  title: "spacing-ui — Headless, accessible React UI primitives",
  description: "Behavior + a11y. You bring the styles.",
};

const navbar = (
  <Navbar logo={<b>spacing-ui</b>} projectLink="https://github.com/nathannewyen/space-ui" />
);

const footer = <Footer>MIT {new Date().getFullYear()} © spacing-ui</Footer>;

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={navbar}
          footer={footer}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/nathannewyen/space-ui/tree/main/apps/docs"
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
