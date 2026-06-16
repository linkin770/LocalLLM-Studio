import type { ThemeConfig } from 'antd';

export const themeConfig: ThemeConfig = {
  token: {
    // 纯灰阶主色 — 强调色不带色相
    colorPrimary: '#08090A',
    colorSuccess: '#0F8A4F',
    colorWarning: '#B45309',
    colorError: '#DC2626',
    colorInfo: '#08090A',
    // 文本色
    colorTextBase: '#08090A',
    colorBgBase: '#FAFAFA',
    colorBgLayout: '#FAFAFA',
    // 边框 alpha 化
    colorBorder: 'rgba(8, 9, 10, 0.10)',
    colorBorderSecondary: 'rgba(8, 9, 10, 0.06)',
    // 几何
    borderRadius: 8,
    borderRadiusLG: 10,
    borderRadiusSM: 6,
    // 字体：MiSans 优先，回退到系统中文
    fontFamily: '"MiSans", "MiSans Latin", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif',
    fontSize: 14,
    // 字号节奏
    fontSizeSM: 12,
    fontSizeLG: 16,
    fontSizeXL: 18,
    fontSizeHeading1: 28,
    fontSizeHeading2: 22,
    fontSizeHeading3: 18,
    // 行高
    lineHeight: 1.5,
    // 控件
    controlHeight: 32,
    controlHeightSM: 26,
    controlHeightLG: 40,
  },
  components: {
    Button: {
      borderRadius: 8,
      controlHeight: 32,
      controlHeightSM: 26,
      controlHeightLG: 40,
      fontWeight: 500,
      primaryShadow: 'none',
      defaultShadow: 'none',
    },
    Input: {
      borderRadius: 8,
      controlHeight: 32,
      activeShadow: '0 0 0 3px rgba(8, 9, 10, 0.08)',
    },
    Select: {
      borderRadius: 8,
      controlHeight: 32,
    },
    Modal: {
      borderRadiusLG: 14,
    },
    Drawer: {
      paddingLG: 0,
    },
    Card: {
      borderRadiusLG: 12,
    },
    Tabs: {
      itemSelectedColor: '#08090A',
      inkBarColor: '#08090A',
      horizontalItemGutter: 24,
    },
    Tooltip: {
      borderRadius: 6,
      colorBgSpotlight: 'rgba(8, 9, 10, 0.92)',
    },
    Notification: {
      borderRadiusLG: 10,
    },
    Message: {
      borderRadiusLG: 10,
    },
  },
};
