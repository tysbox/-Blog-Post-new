import React from "react";
import { useTina } from "tinacms/dist/react";
import { TinaMarkdown } from "tinacms/dist/rich-text";

export default function AdminBlogPost(props) {
  const { data } = useTina({
    query: props.query,
    variables: props.variables,
    data: props.data,
  });

  const { blog } = data;

  return (
    <div className="content">
      <TinaMarkdown content={blog.body} />
    </div>
  );
}
