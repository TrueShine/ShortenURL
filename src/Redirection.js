import * as React from "react";
import { useLocation } from "react-router-dom";

function Redirection() {
  const location = useLocation();

  // 현재 URL 경로
  const currentPath = location.pathname.replace("/", "");

  //   // 쿼리 매개변수
  //   const queryParams = new URLSearchParams(location.search);

  //   // 쿼리 매개변수 값 가져오기
  //   const paramValue = queryParams.get("paramName");

  window.location.replace(
      "https://m.search.naver.com/search.naver?sm=mtp_hty.top&where=m&query=" +
      currentPath
  );

  // TODO: 통계?

  return (
    <div>
      <p>Current Path: {currentPath}</p>
    </div>
  );
}

export default Redirection;
