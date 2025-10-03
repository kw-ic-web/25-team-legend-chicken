---
name: "✨ Feature (기능 추가) template"
about: Describe this issue template's purpose here.
title: ""
labels: ""
assignees: ""
---

name: "✨ Feature"
description: "새로운 기능 추가 요청"
title: "[Feature] "
labels: ["feature"]
body:

- type: textarea
  attributes:
  label: 📌 목적
  description: 기능이 필요한 이유를 간단히 설명해주세요.
  placeholder: 예) 사용자에게 A 기능을 제공하기 위해
  validations:
  required: true

- type: textarea
  attributes:
  label: 🛠 구현 내용
  description: 실제로 구현할 내용을 상세히 적어주세요.
  placeholder: 컴포넌트, 상태관리, 라우팅 등 포함
  validations:
  required: true

- type: checkboxes
  attributes:
  label: ✅ 작업 항목
  description: 세부 작업 단계를 체크박스로 작성해주세요.
  options: - label: UI 레이아웃 구성 - label: API 연동 - label: 상태관리 - label: 테스트 / 검수 - label: PR 생성
  validations:
  required: false

- type: textarea
  attributes:
  label: 🔗 참고 자료
  description: 참고할 수 있는 디자인, 문서, 링크 등을 입력해주세요.
  placeholder: Figma, Notion 링크 등
  validations:
  required: false
