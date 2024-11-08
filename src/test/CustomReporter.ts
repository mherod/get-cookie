import { Reporter as VitestReporter, File, TaskResultPack, Awaitable, TaskResult, Task, ErrorWithDiff } from 'vitest';

export default class CustomReporter implements VitestReporter {
    private startTime: number = 0;
    private readonly FAIL_STATE = 'fail';
    private readonly PASS_STATE = 'pass';
    private readonly SKIP_STATE = 'skip';
    private readonly TEST_SUITE_START_MSG = '\n🧪 Running Test Suite';
    private readonly TEST_SUITE_END_MSG = '\n🎯 Test Suite Complete';

    onInit(): void {
        console.log(this.TEST_SUITE_START_MSG);
        console.log('━'.repeat(50));
        this.startTime = Date.now();
    }

    onFinished(files?: File[], errors?: unknown[]): void {
        const duration = Date.now() - this.startTime;
        console.log('━'.repeat(50));
        console.log(`${this.TEST_SUITE_END_MSG} in ${(duration / 1000).toFixed(2)}s`);

        if (files) {
            const totalTests = files.reduce((sum, file) => sum + file.tasks.length, 0);
            const failedTests = files.reduce((sum, file) =>
                sum + file.tasks.filter(task => task.result?.state === this.FAIL_STATE).length, 0);
            const passedTests = files.reduce((sum, file) =>
                sum + file.tasks.filter(task => task.result?.state === this.PASS_STATE).length, 0);
            const skippedTests = files.reduce((sum, file) =>
                sum + file.tasks.filter(task => task.result?.state === this.SKIP_STATE).length, 0);

            console.log('\n📊 Test Summary:');
            console.log(`📝 Total Tests: ${totalTests}`);
            console.log(`✅ Passed: ${passedTests} (${((passedTests/totalTests) * 100).toFixed(1)}%)`);
            console.log(`❌ Failed: ${failedTests} (${((failedTests/totalTests) * 100).toFixed(1)}%)`);
            console.log(`⏭️  Skipped: ${skippedTests} (${((skippedTests/totalTests) * 100).toFixed(1)}%)`);
        }
    }

    private logTestError(taskName: string, error: ErrorWithDiff): void {
        console.error('\n❌ Test Failure Details:');
        console.error(`🔍 Test: ${taskName}`);
        console.error(`💬 Message: ${error.message}`);
        if (error.diff) {
            console.error('\n📈 Diff:');
            console.error(error.diff);
        }
        if (error.stack) {
            console.error('\n🔍 Stack Trace:');
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

            const { state, duration = 0 } = result.result;
            const stateIcon = state === this.PASS_STATE ? '✅' :
                            state === this.FAIL_STATE ? '❌' :
                            state === this.SKIP_STATE ? '⏭️' : '❔';

            const durationStr = (duration / 1000).toFixed(3);
            const durationColor = duration > 1000 ? '🐢' : duration > 500 ? '🚶' : '🏃';
            console.log(`${stateIcon} ${result.task.name} ${durationColor} (${durationStr}s)`);

            if (state === this.FAIL_STATE && result.result.errors) {
                this.handleFailedTest(result.task.name, result.result.errors);
            }
        }
    }

    onCollected(files?: File[]): Awaitable<void> {
        if (files) {
            const totalTests = files.reduce((sum, file) => sum + file.tasks.length, 0);
            console.log(`📁 Found ${files.length} test files containing ${totalTests} tests`);
            console.log('━'.repeat(50));
        }
    }
}