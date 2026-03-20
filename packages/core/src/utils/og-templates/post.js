import satori from "satori";
import QRCode from "qrcode";
import { SITE } from "virtual:astro-minimax/config";
import loadGoogleFonts from "../loadGoogleFont";
import { getPostSlug } from "../getPath";

async function generateQRCode(data, size = 100) {
  return await QRCode.toDataURL(data, {
    width: size,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#1e293b", light: "#ffffff" },
  });
}

export default async (post) => {
  const { title, author, description, pubDatetime, category } = post.data;
  const lang = post.id.startsWith("en/") ? "en" : "zh";
  const slug = getPostSlug(post.id);
  
  const isEn = lang === "en";
  
  const labels = {
    scanToRead: isEn ? "Scan to read full article" : "扫码阅读全文",
    published: isEn ? "Published" : "发布于",
  };
  
  const dateStr = pubDatetime
    ? new Date(pubDatetime).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const postUrl = `${SITE.website}/${lang}/posts/${slug}`;
  const qrDataUrl = await generateQRCode(postUrl, 100);
  const domain = SITE.website ? new URL(SITE.website).hostname : "blog.dev";
  const displayUrl = `${domain}/${lang}/posts/${slug}`;

  return satori(
    {
      type: "div",
      props: {
        style: {
          background: "#e2e8f0",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "35px",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                width: "920px",
                background: "#ffffff",
                borderRadius: "16px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      padding: "32px 36px 24px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            alignItems: "center",
                            gap: "14px",
                          },
                          children: [
                            {
                              type: "div",
                              props: {
                                style: {
                                  width: "42px",
                                  height: "42px",
                                  borderRadius: "10px",
                                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                },
                                children: {
                                  type: "span",
                                  props: {
                                    style: { color: "#fff", fontSize: "20px", fontWeight: 700 },
                                    children: SITE.title?.charAt(0) || "B",
                                  },
                                },
                              },
                            },
                            {
                              type: "div",
                              props: {
                                style: { display: "flex", flexDirection: "column", gap: "2px" },
                                children: [
                                  {
                                    type: "span",
                                    props: {
                                      style: { fontSize: "16px", fontWeight: 600, color: "#1e293b" },
                                      children: SITE.title || "Blog",
                                    },
                                  },
                                  {
                                    type: "span",
                                    props: {
                                      style: { fontSize: "13px", color: "#64748b" },
                                      children: author || SITE.author,
                                    },
                                  },
                                ],
                              },
                            },
                            category
                              ? {
                                  type: "div",
                                  props: {
                                    style: {
                                      marginLeft: "auto",
                                      background: "#f1f5f9",
                                      padding: "5px 12px",
                                      borderRadius: "6px",
                                      fontSize: "13px",
                                      color: "#475569",
                                    },
                                    children: category,
                                  },
                                }
                              : null,
                          ].filter(Boolean),
                        },
                      },
                      {
                        type: "h1",
                        props: {
                          style: {
                            fontSize: 28,
                            fontWeight: 700,
                            color: "#0f172a",
                            lineHeight: 1.4,
                            margin: 0,
                          },
                          children: title,
                        },
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "14px",
                            color: "#64748b",
                          },
                          children: dateStr ? [{ type: "span", props: { children: `${labels.published} ${dateStr}` } }] : [],
                        },
                      },
                    ],
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      padding: "0 36px 28px",
                      display: "flex",
                      flexDirection: "column",
                    },
                    children: [
                      {
                        type: "p",
                        props: {
                          style: {
                            fontSize: "15px",
                            color: "#475569",
                            lineHeight: 1.7,
                            margin: 0,
                          },
                          children:
                            description && description.length > 100
                              ? description.slice(0, 100) + "..."
                              : description || "",
                        },
                      },
                    ],
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      padding: "20px 36px",
                      background: "#f8fafc",
                      borderTop: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: { display: "flex", flexDirection: "column", gap: "4px" },
                          children: [
                            {
                              type: "span",
                              props: {
                                style: { fontSize: "13px", color: "#94a3b8" },
                                children: labels.scanToRead,
                              },
                            },
                            {
                              type: "span",
                              props: {
                                style: { fontSize: "14px", fontWeight: 500, color: "#3b82f6" },
                                children: displayUrl,
                              },
                            },
                          ],
                        },
                      },
                      {
                        type: "img",
                        props: {
                          src: qrDataUrl,
                          width: 72,
                          height: 72,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      embedFont: true,
      fonts: await loadGoogleFonts(title + (description || "") + author + SITE.title + dateStr),
    }
  );
};