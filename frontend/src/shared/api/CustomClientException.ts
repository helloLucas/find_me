import type { ProblemDetail } from "../types/api";

export class CustomClientException extends Error {
  public problemType: string;
  public status: number;
  public detail: string;
  public instance: string;
  public code: string;

  constructor(problem: ProblemDetail) {
    super(problem.title || problem.detail || "API Error");
    this.name = "CustomClientException";
    this.problemType = problem.type;
    this.status = problem.status;
    this.detail = problem.detail;
    this.instance = problem.instance;
    this.code = problem.code;
  }
}
