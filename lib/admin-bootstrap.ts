import { passwordStrength } from "./password-strength";

/**
 * 读取管理员初始化凭据。没有默认值，缺失或弱密码直接阻止初始化。
 */
export function readAdminProvisioningCredentials(): {
  username: string;
  password: string;
} {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error("ADMIN_USERNAME 和 ADMIN_PASSWORD 必须显式配置");
  }
  if (password.length < 12 || passwordStrength(password) === "weak") {
    throw new Error("ADMIN_PASSWORD 必须至少 12 位且不能使用常见弱密码");
  }
  return { username, password };
}
