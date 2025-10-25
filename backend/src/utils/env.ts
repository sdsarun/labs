import dotenv from "dotenv";

export function loadEnv(options?: dotenv.DotenvConfigOptions) {
  dotenv.config(options);
}
