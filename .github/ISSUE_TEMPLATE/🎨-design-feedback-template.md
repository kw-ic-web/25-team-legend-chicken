---
name: "\U0001F3A8 Design Feedback template"
about: Describe this issue template's purpose here.
title: ""
labels: ""
assignees: ""
---

name: "🎨 Design Feedback"
description: "디자인 피드백 요청"
title: "[Design] "
labels: ["design"]
body:

- type: textarea
  attributes:
  label: 💬 피드백 요청 내용
  description: 어떤 부분에 대해 피드백이 필요한지 작성해주세요.
  placeholder: 예) 버튼 hover 상태가 너무 튀어 보임
  validations:
  required: true

- type: textarea
  attributes:
  label: 🖼 참고 이미지 / 링크
  description: 피드백에 참고할 수 있는 이미지나 디자인 링크가 있다면 작성해주세요.
  placeholder: 선택 사항입니다.
  validations:
  required: false
