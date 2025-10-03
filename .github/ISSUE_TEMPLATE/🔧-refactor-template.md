---
name: "\U0001F527 Refactor template"
about: Describe this issue template's purpose here.
title: ""
labels: ""
assignees: ""
---

name: "🔧 Refactor"
description: "리팩토링 작업"
title: "[Refactor] "
labels: ["refactor"]
body:

- type: textarea
  attributes:
  label: 💡 리팩토링 대상
  description: 개선이 필요한 코드 영역을 설명해주세요.
  placeholder: 예) useEffect 내부의 중복 조건문
  validations:
  required: true

- type: textarea
  attributes:
  label: 🔄 개선 방향
  description: 어떤 식으로 개선하려는지 설명해주세요.
  placeholder: 조건 분리 + early return 구조로 변경 예정
  validations:
  required: true
