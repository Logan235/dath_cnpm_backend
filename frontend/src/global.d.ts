declare module "*.css" {
  const stylesheet: string;
  export default stylesheet;
}

declare module "*.module.css" {
  const styles: Record<string, string>;
  export default styles;
}
