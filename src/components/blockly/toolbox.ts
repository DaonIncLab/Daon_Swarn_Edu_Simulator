import {
  blockCategories as categories,
  getCategoryBlocks,
  type BlocklyCategoryId,
} from "./registry";

export { categories, getCategoryBlocks };
export type { BlocklyCategoryId };

export const toolboxConfig = {
  kind: "flyoutToolbox",
  contents: getCategoryBlocks("flight"),
};
