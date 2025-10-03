---
name: "❓ Question template"
about: Describe this issue template's purpose here.
title: ""
labels: ""
assignees: ""
---

name: "❓ Question"
description: "질문 또는 논의가 필요한 항목"
title: "[Question] "
labels: ["question"]
body:

- type: textarea
  attributes:
  label: ❔ 질문 내용
  description: 궁금한 점 또는 결정이 필요한 사항을 작성해주세요.
  placeholder: 예) API 응답 상태별 처리 방식은 어떻게 할까요?
  validations:
  required: true

- type: textarea
  attributes:
  label: 💬 배경 및 맥락
  description: 질문하게 된 배경이나 맥락이 있다면 설명해주세요.
  placeholder: 선택 사항입니다.
  validations:
  required: false
