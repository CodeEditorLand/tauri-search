import { readFileSync } from "fs";
import matter from "gray-matter";

describe("frontmatter tests", () => {

  it("faq", () => {
    const content = readFileSync("test/fixtures/prose/faq.md", "utf-8");
    const output = matter(content);
    console.log(output)
  });

});
