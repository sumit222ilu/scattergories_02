import styled from "styled-components";

export const Page = styled.div`
  font-family: Arial;
  padding: 20px;
  background: #f5f6fa;
  min-height: 100vh;

  * {
    box-sizing: border-box;
    padding: 0;
    margin: 0;
  }
`;

export const Card = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  margin-top: 20px;

  div {
    margin-top: 5px;
  }

  .quesAnsWrapper {
    display: flex;
    justify-content: space-between;
  }
  .quesAnsWrapper .quesAns {
    font-size: 1rem;
    font-weight: bold;
    
    em {
      font-size: 0.8rem;
      margin-top: -1px;
      color: #666;
    }
  }
  .quesAnsWrapper .quesAns span {
    color: green;
  }

  .grayColorBox {
    padding: 10px;
    margin-bottom: 10px;
    background-color: #f0f0f0;
    border-radius: 10px;
  }

  &.historyWrapper {
    margin-top: 40px;
  }
`;

export const Input = styled.input`
  width: 100%;
  padding: 10px;
  margin: 16px 0 10px;
`;

export const TextArea = styled.textarea`
  width: 100%;
  padding: 10px;
`;

export const Button = styled.button`
  padding: 10px;
  background: #2f80ed;
  color: white;
  border: none;
  cursor: pointer;
  width: 100%;

  &.autoWidth {
    width: auto;
  }
  &.red {
    background: red;
  }

  &:disabled {
    background: #ccc;
  }
`;

export const Timer = styled.div`
  position: absolute;
  top: 5px;
  right: 15px;
  font-size: 16px;
  font-weight: bold;
  color: red;
`;
