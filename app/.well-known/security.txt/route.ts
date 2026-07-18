const SECURITY_TEXT = `Contact: https://github.com/dttxorg/giffgaff-reminder-system/security/advisories/new
Expires: 2027-07-18T00:00:00.000Z
Preferred-Languages: zh-CN, en
Canonical: https://baohao.681218.xyz/.well-known/security.txt
Policy: https://github.com/dttxorg/giffgaff-reminder-system/security/policy
`;

export function GET() {
  return new Response(SECURITY_TEXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
