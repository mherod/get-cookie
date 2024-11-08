import { Reporter as VitestReporter, File, TaskResultPack, Awaitable, TaskResult, Task, ErrorWithDiff } from 'vitest';

export default class CustomReporter implements VitestReporter {
    private startTime: number = 0;
    private readonly FAIL_STATE = 'fail';
    private readonly TEST_SUITE_START_MSG = '\nTest Suite Started';
    private readonly TEST_SUITE_END_MSG = '\nTest Suite Finished in';

    onInit(): void {
        console.log(this.TEST_SUITE_START_MSG);
        this.startTime = Date.now();
    }

    onFinished(files?: File[], errors?: unknown[]): void {
        const duration = Date.now() - this.startTime;
        console.log(`${this.TEST_SUITE_END_MSG} ${duration}ms`);

        if (files) {
            const totalTests = files.reduce((sum, file) => sum + file.tasks.length, 0);
            console.log(`Total tests: ${totalTests}`);
        }
    }

    private logTestError(taskName: string, error: ErrorWithDiff): void {
        console.error(`Error in ${taskName}:`, error.message);
        if (error.stack) {
            console.error(error.stack);
        }
    }

    private handleFailedTest(taskName: string, errors: ErrorWithDiff[]): void {
        for (const error of errors) {
            this.logTestError(taskName, error);
        }
    }

    onTaskUpdate(packs: TaskResultPack[]): Awaitable<void> {
        for (const pack of packs) {
            const result = pack as unknown as { result: TaskResult; task: Task };

            if (!result.result) continue;

            const { state, duration } = result.result;
            console.log(`${result.task.name}: ${state} (${duration}ms)`);

            if (state === this.FAIL_STATE && result.result.errors) {
                this.handleFailedTest(result.task.name, result.result.errors);
            }
        }
    }

    onCollected(files?: File[]): Awaitable<void> {
        if (files) {
            console.log(`Collected ${files.length} test files`);
        }
    }
}