---
name: " \U0001F41B Bug  template"
about: Describe this issue template's purpose here.
title: ""
labels: ""
assignees: ""
---

name: "🐛 Bug"
description: "버그 리포트"
title: "[Bug] "
labels: ["bug"]
body:

- type: textarea
  attributes:
  label: 🐞 버그 설명
  description: 어떤 문제가 발생했는지 명확하게 설명해주세요.
  placeholder: 예) 버튼 클릭 시 페이지가 리로딩됩니다.
  validations:
  required: true

- type: textarea
  attributes:
  label: ✅ 재현 방법
  description: 어떤 조건에서 버그가 발생하는지 재현 방법을 작성해주세요.
  placeholder: 어떤 페이지에서, 어떤 동작을 했을 때 등
  validations:
  required: true

- type: textarea
  attributes:
  label: 📸 스크린샷 / 콘솔 로그
  description: 있다면 첨부해주세요.
  placeholder: 선택 사항입니다
  validations:
  required: false
