import { Helmet } from "react-helmet-async";

interface PageSeoProps {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}

const SITE = "https://trendfood.site";

export default function PageSeo({ title, description, path, noindex }: PageSeoProps) {
  const url = `${SITE}${path.startsWith("/") ? path : `/${path}`}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {noindex && <meta name="robots" content="noindex,follow" />}
    </Helmet>
  );
}