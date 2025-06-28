// 动态加载 config.json 并导出配置
export async function loadConfig() {
  const res = await fetch('./config.json');
  if (!res.ok) throw new Error('配置文件加载失败');
  return await res.json();
}
