import type { Metadata } from "next";
import AdminApp from "@/admin/AdminApp";

export const metadata: Metadata = {
  title: "内容后台",
  description: "站点内容配置后台",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminPage() {
  return <AdminApp />;
}
